import { useEffect, useMemo, useState } from "react";
import { clockIn, clockOut, getTodayAttendance, uploadWorkDocFile } from "../../services/attendanceService";
import { toast } from "sonner";
import {
  CheckCircle,
  MapPin,
  XCircle,
  Clock,
  LogIn,
  LogOut,
  Building2,
  HardHat,
  Navigation,
  AlertCircle,
  Info,
} from "lucide-react";
import attendanceLocations from "../../configs/attendanceLocations";
import { createPortal } from "react-dom";

const MapPortal = ({ children }) => {
  const [target, setTarget] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check initially
    let el = document.getElementById("map-preview-portal");
    if (el) {
      setTarget(el);
      setMounted(true);
      return;
    }

    // If not found (due to sibling render order), poll for it
    const interval = setInterval(() => {
      el = document.getElementById("map-preview-portal");
      if (el) {
        setTarget(el);
        setMounted(true);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  if (target) {
    return createPortal(children, target);
  }
  return <>{children}</>;
};



const RADIO_OPTIONS = [
  { value: "office", label: "Office", icon: Building2, hint: "Inside the office geofence" },
  { value: "construction", label: "Construction / Outside", icon: HardHat, hint: "Field work — no range check" },
];

const toRad = (value) => (value * Math.PI) / 180;

const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const earthRadius = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

/* ── Status chip — larger, clearer, with primary + secondary text ── */
const StatusChip = ({ success, primaryText, secondaryText, noIcon = false, centered = false }) => {
  const base =
    "flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[0.8rem] leading-snug font-medium border w-full";
  const Icon = success ? CheckCircle : XCircle;
  const colors = success
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
    : "bg-red-500/10 text-red-300 border-red-500/20";

  return (
    <div className={`${base} ${colors} ${centered ? "justify-center text-center items-center" : ""}`}>
      {!noIcon && <Icon className="h-4 w-4 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <span className="block font-semibold">{primaryText}</span>
        {secondaryText && (
          <span className="block text-[0.7rem] opacity-70 mt-0.5">{secondaryText}</span>
        )}
      </div>
    </div>
  );
};

const LocationAttendance = ({
  role,
  workDoc = '', // Work documentation note from parent
  workDocAttachments = [], // File attachments
  className = "rounded-2xl border border-white/10 bg-[#001f35]/70 p-4 sm:p-6 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]",
  title = "Attendance",
  description = "Select your work mode, then capture your location to enable Time In / Out.",
  onStatusChange,
  onRecordSaved,
}) => {
  const [mode, setMode] = useState("office");
  const [modeOut, setModeOut] = useState("office");
  const [locationIn, setLocationIn] = useState(null);
  const [locationInError, setLocationInError] = useState("");
  const [locationOut, setLocationOut] = useState(null);
  const [locationOutError, setLocationOutError] = useState("");
  const [processing, setProcessing] = useState("");
  const [todayRecord, setTodayRecord] = useState(null);
  const [banner, setBanner] = useState(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [mapView, setMapView] = useState("roadmap");

  const officeConfig = attendanceLocations.mainOffice || {
    name: "Office",
    latitude: 0,
    longitude: 0,
    radius: 1000,
  };
  const officeLabel = officeConfig?.name ?? "Office";

  useEffect(() => {
    const fetchToday = async () => {
      setLoadingToday(true);
      try {
        const data = await getTodayAttendance();
        setTodayRecord(data?.record || null);
      } catch (err) {
        setTodayRecord(null);
      } finally {
        setLoadingToday(false);
      }
    };
    fetchToday();
  }, []);

  const requestCoordinates = (setter, errorSetter) => {
    if (!navigator.geolocation) {
      errorSetter("Geolocation is not supported by your browser.");
      return;
    }
    errorSetter("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setter({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        errorSetter("Unable to retrieve location. Please enable location access.");
      }
    );
  };

  const officeDistanceIn = useMemo(() => {
    if (!locationIn) return null;
    return calculateDistanceMeters(
      locationIn.latitude,
      locationIn.longitude,
      officeConfig.latitude,
      officeConfig.longitude
    );
  }, [locationIn, officeConfig]);

  const officeDistanceOut = useMemo(() => {
    if (!locationOut) return null;
    return calculateDistanceMeters(
      locationOut.latitude,
      locationOut.longitude,
      officeConfig.latitude,
      officeConfig.longitude
    );
  }, [locationOut, officeConfig]);

  const hasClockedIn = Boolean(todayRecord?.time_in);
  const hasClockedOut = Boolean(todayRecord?.time_out);

  const inRangeIn = mode === "office" ? officeDistanceIn != null && officeDistanceIn <= officeConfig.radius : true;
  const inRangeOut = modeOut === "office" ? officeDistanceOut != null && officeDistanceOut <= officeConfig.radius : true;

  // ── Early timeout prevention: map session types to their end times ──
  const SESSION_END_TIMES = {
    morning: { hour: 12, minute: 0, label: "12:00 PM" },
    afternoon: { hour: 17, minute: 0, label: "5:00 PM" },
  };

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000); // update every 30s
    return () => clearInterval(id);
  }, []);

  // Removed session-based locking logic so users can time out anytime.
  const isBeforeSessionEnd = false;
  const earlyTimeoutMessage = null;

  const canTimeIn = Boolean(locationIn) && inRangeIn && !hasClockedIn;
  const canTimeOut = Boolean(locationOut) && inRangeOut && !hasClockedOut;

  useEffect(() => {
    onStatusChange?.({ ready: canTimeIn || canTimeOut, locationIn, locationOut, isBeforeSessionEnd, earlyTimeoutMessage, processing: !!processing });
  }, [canTimeIn, canTimeOut, locationIn, locationOut, onStatusChange, isBeforeSessionEnd, earlyTimeoutMessage, processing]);

  const fallbackLocation = useMemo(
    () => ({
      latitude: officeConfig.latitude,
      longitude: officeConfig.longitude,
    }),
    [officeConfig.latitude, officeConfig.longitude]
  );

  const mapCenter = locationOut || locationIn || fallbackLocation;
  const mapLat = mapCenter.latitude ?? fallbackLocation.latitude;
  const mapLng = mapCenter.longitude ?? fallbackLocation.longitude;
  const mapTypeParam = mapView === "satellite" ? "k" : "m";
  const mapSrc = `https://maps.google.com/maps?output=embed&hl=en&q=${encodeURIComponent(
    `${mapLat},${mapLng}`
  )}&z=17&t=${mapTypeParam}`;

  const renderMapViewToggle = () => (
    <div className="inline-flex items-center rounded-lg border border-white/15 bg-black/30 p-1 text-[0.65rem] font-semibold uppercase tracking-wider">
      <button
        type="button"
        onClick={() => setMapView("roadmap")}
        className={`rounded-md px-2.5 py-1 transition ${
          mapView === "roadmap"
            ? "bg-white/15 text-white"
            : "text-white/55 hover:text-white/80"
        }`}
      >
        Map
      </button>
      <button
        type="button"
        onClick={() => setMapView("satellite")}
        className={`rounded-md px-2.5 py-1 transition ${
          mapView === "satellite"
            ? "bg-white/15 text-white"
            : "text-white/55 hover:text-white/80"
        }`}
      >
        Satellite
      </button>
    </div>
  );

  const handleTimeAction = async (type) => {
    if ((type === "in" && !canTimeIn) || (type === "out" && !canTimeOut)) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setBanner({ tone: "error", text: "Missing login token. Please login again." });
      return;
    }

    const isTimeIn = type === "in";
    const location = isTimeIn ? locationIn : locationOut;
    const modeValue = isTimeIn ? mode : modeOut;

    // Validate work documentation on clock-out for PM session only
    if (!isTimeIn && todayRecord?.session_type === 'afternoon') {
      const plainText = workDoc.replace(/<[^>]*>/g, '').trim();
      if (!plainText && (!workDocAttachments || workDocAttachments.length === 0)) {
        toast.error("Work Documentation Required", {
          description: "Please add a work documentation note or file before clocking out for the afternoon.",
        });
        return;
      }
    }

    setProcessing(type);
    setBanner(null);

    try {
      const payload = {
        mode: modeValue,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy,
      };

      // Include work documentation on clock-out
      if (!isTimeIn && workDoc) {
        // Extract plain text from HTML/rich text editor
        const plainText = workDoc.replace(/<[^>]*>/g, '').trim();
        if (plainText) {
          payload.work_doc_note = plainText;
        }
      }

      const endpoint = isTimeIn ? clockIn : clockOut;
      const data = await endpoint(payload);

      const attendance = data?.attendance || null;
      setTodayRecord(attendance);

      if (!isTimeIn && attendance?.id && workDocAttachments?.length > 0) {
        setBanner({ tone: "info", text: "Uploading attachments..." });
        let uploadErrors = 0;
        for (const file of workDocAttachments) {
          try {
            await uploadWorkDocFile(attendance.id, file);
          } catch (uploadErr) {
            console.error("Failed to upload file", file.name, uploadErr);
            uploadErrors++;
          }
        }
        if (uploadErrors > 0) {
          toast.error("Upload Warning", {
            description: `${uploadErrors} attachment(s) failed to upload.`,
          });
        }
      }

      toast.success(`Time ${isTimeIn ? "In" : "Out"} Recorded`, {
        description: `Your time ${isTimeIn ? "in" : "out"} has been saved successfully.`,
      });
      onRecordSaved?.(attendance);
    } catch (error) {
      const message = error.response?.data?.error || "Unable to save attendance.";
      toast.error("Attendance Error", {
        description: message,
      });
    } finally {
      setProcessing("");
    }
  };

  /* ── Location section renderer — now with accent border + icon ── */
  const renderLocationSection = (
    label,
    SectionIcon,
    accentColor,
    location,
    error,
    handler,
    distance,
    rangeOk
  ) => {
    return (
      <div
        className="rounded-xl border border-white/8 bg-white/[0.03] p-4 space-y-3"
      >
        {/* Section header */}
        <div className="flex items-center gap-2.5">
          <p className="text-white font-semibold text-[0.95rem] tracking-tight">
            {label}
          </p>
        </div>

        {/* Status display */}
        <div className="space-y-2">
          {location && rangeOk && (
            <StatusChip
              success
              primaryText="Location captured successfully"
              secondaryText={`Coords: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}${location.accuracy ? ` · Accuracy: ±${Math.round(location.accuracy)}m` : ""
                }`}
            />
          )}
          {location && !rangeOk && (
            <StatusChip
              success={false}
              primaryText={`Outside ${officeLabel} radius`}
              secondaryText={`You are ${distance ? distance.toFixed(0) : "—"}m away (max ${officeConfig.radius}m)`}
            />
          )}
          {error && (
            <StatusChip success={false} primaryText="Location error" secondaryText={error} />
          )}
          {!location && !error && (
            <StatusChip
              success={false}
              primaryText="Waiting for location"
              secondaryText="Tap the button below to capture your position"
              noIcon
              centered
            />
          )}
        </div>

        {/* Capture button */}
        <button
          type="button"
          disabled={!!processing}
          onClick={handler}
          className={`w-full flex items-center justify-center gap-2 rounded-xl border border-[#FF7120]/40 bg-[#FF7120]/10 px-4 py-2.5 text-sm font-semibold text-[#FF7120] hover:bg-[#FF7120]/20 active:scale-[0.98] transition ${!!processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Navigation className="h-4 w-4" />
          {location ? "Re-capture Location" : "Capture My Location"}
        </button>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* ── Card header ── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-white font-semibold text-lg leading-tight">
              {hasClockedIn && !hasClockedOut ? "Time Out" : "Time In"}
            </h3>
          </div>
        </div>
      </div>


      {/* ── Mode selector ── */}
      {!hasClockedIn && (
        <div className="mt-5">
          <div className="h-6" />
          <div className="grid gap-3 lg:grid-cols-2">
            {RADIO_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              const isActive = mode === option.value;
              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border px-4 py-3 transition flex items-center gap-3 ${isActive
                    ? "border-[#FF7120]/70 bg-[#FF7120]/10 text-white shadow-[0_0_16px_rgba(255,113,32,0.08)]"
                    : "border-white/12 bg-transparent text-white/55 hover:border-white/30 hover:text-white/70"
                    }`}
                >
                  <input
                    type="radio"
                    name="attendance-mode"
                    value={option.value}
                    className="hidden"
                    checked={isActive}
                    onChange={() => setMode(option.value)}
                  />
                  <div
                    className={`grid place-items-center h-8 w-8 rounded-lg shrink-0 ${isActive
                      ? "bg-[#FF7120]/20 text-[#FF7120]"
                      : "bg-white/5 text-white/40"
                      }`}
                  >
                    <OptionIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{option.label}</span>
                    <span className="block text-[0.7rem] opacity-60 mt-0.5">{option.hint}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Map section for Time Out ── */}
      {hasClockedIn && !hasClockedOut && (
        <MapPortal>
            <div className="relative">
              <div>
                {/* Mode selector */}
                <div className="mb-4">
                  <div className="h-6" />
                  <div className="grid gap-3 lg:grid-cols-2 mb-4">
                    {RADIO_OPTIONS.map((option) => {
                      const OptionIcon = option.icon;
                      const isActive = modeOut === option.value;
                      return (
                        <label
                          key={`out-${option.value}`}
                          className={`cursor-pointer rounded-xl border px-4 py-3 transition flex items-center gap-3 ${isActive
                            ? "border-[#FF7120]/70 bg-[#FF7120]/10 text-white shadow-[0_0_16px_rgba(255,113,32,0.08)]"
                            : "border-white/12 bg-transparent text-white/55 hover:border-white/30 hover:text-white/70"
                            }`}
                        >
                          <input
                            type="radio"
                            name="attendance-mode-out"
                            value={option.value}
                            className="hidden"
                            checked={isActive}
                            onChange={() => setModeOut(option.value)}
                          />
                          <div
                            className={`grid place-items-center h-8 w-8 rounded-lg shrink-0 ${isActive
                              ? "bg-[#FF7120]/20 text-[#FF7120]"
                              : "bg-white/5 text-white/40"
                              }`}
                          >
                            <OptionIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-semibold leading-tight">{option.label}</span>
                            <span className="block text-[0.7rem] opacity-60 mt-0.5">{option.hint}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Map */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold">Location Preview</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderMapViewToggle()}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden mt-2">
                  <iframe
                    title="Attendance location map"
                    className="w-full h-60 sm:h-64 lg:h-72 border-0"
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-white/45 mt-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <p>
                    {locationIn || locationOut
                      ? "Showing your captured coordinates on the map. Drag or zoom to inspect."
                      : `Showing ${officeLabel} as a reference area. Capture your location to update the marker.`}
                  </p>
                </div>

                {/* Location capture */}
                <div className="mt-6">
                  {renderLocationSection(
                    "Time Out Location",
                    LogOut,
                    "amber",
                    locationOut,
                    locationOutError,
                    () => requestCoordinates(setLocationOut, setLocationOutError),
                    officeDistanceOut,
                    inRangeOut
                  )}
                </div>
              </div>
            </div>

            {/* Time Out button + early-timeout banner — always outside the locked zone */}
            <div className="mt-4">
              <button
                type="button"
                disabled={!canTimeOut || processing === "out"}
                onClick={() => {
                  handleTimeAction("out");
                }}
                className={[
                  "w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white transition shadow-[0_12px_24px_rgba(0,0,0,0.22)]",
                  !canTimeOut || processing === "out"
                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                    : "bg-[#FF7120] hover:brightness-95 active:scale-[0.98]",
                ].join(" ")}
              >
                {processing === "out" ? "Processing..." : "Time Out"}
              </button>
              {earlyTimeoutMessage && !hasClockedOut && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{earlyTimeoutMessage}</span>
                </div>
              )}
            </div>

            {/* Footer info for Time Out */}

          
        </MapPortal>
      )}

      {/* ── Time In Map section ── */}
      {!hasClockedIn && (
        <>
          <div className="mt-6 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold">Location Preview</p>
              </div>
              <div className="flex items-center gap-2">
                {renderMapViewToggle()}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
              <iframe
                title="Attendance location map"
                className="w-full h-60 sm:h-64 lg:h-72 border-0"
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-white/45">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                {locationIn || locationOut
                  ? "Showing your captured coordinates on the map. Drag or zoom to inspect."
                  : `Showing ${officeLabel} as a reference area. Capture your location to update the marker.`}
              </p>
            </div>
          </div>

          {/* ── Time In location section ── */}
          <div className="mt-6 grid gap-4 lg:grid-cols-1">
            {renderLocationSection(
              "Time In Location",
              LogIn,
              "emerald",
              locationIn,
              locationInError,
              () => requestCoordinates(setLocationIn, setLocationInError),
              officeDistanceIn,
              inRangeIn
            )}
          </div>

          {/* ── Action buttons ── */}
          <div className="mt-6">
            <button
              type="button"
              disabled={!canTimeIn || processing === "in"}
              onClick={() => {
                handleTimeAction("in");
              }}
              className={[
                "w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white transition shadow-[0_12px_24px_rgba(0,0,0,0.22)]",
                !canTimeIn || processing === "in"
                  ? "bg-white/10 text-white/40 cursor-not-allowed"
                  : "bg-[#FF7120] hover:brightness-95 active:scale-[0.98]",
              ].join(" ")}
            >
              {processing === "in" ? "Processing..." : "Time In"}
            </button>
          </div>

          {/* ── Footer info ── */}
        </>
      )}
    </div>
  );
};

export default LocationAttendance;
