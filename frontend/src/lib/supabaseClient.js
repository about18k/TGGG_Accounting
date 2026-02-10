// Placeholder Supabase client
// Replace with actual Supabase configuration when needed

const supabase = {
  storage: {
    from: (bucket) => ({
      upload: async (path, file, options) => {
        return { data: { path }, error: null };
      },
      getPublicUrl: (path) => {
        return { data: { publicUrl: `https://placeholder.supabase.co/storage/v1/object/public/${path}` }, error: null };
      }
    })
  }
};

export default supabase;
