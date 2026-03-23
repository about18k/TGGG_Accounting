from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('todos', '0003_departmenttask_todos_depar_departm_671811_idx_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='todonotification',
            name='type',
            field=models.CharField(
                choices=[
                    ('task_suggested', 'Task Suggested'),
                    ('task_confirmed', 'Task Confirmed'),
                    ('task_rejected', 'Task Rejected'),
                    ('task_assigned', 'Task Assigned'),
                    ('completion_requested', 'Completion Requested'),
                    ('completion_confirmed', 'Completion Confirmed'),
                    ('completion_rejected', 'Completion Rejected'),
                    ('dept_task_suggested', 'Department Task Suggested'),
                    ('dept_task_grabbed', 'Department Task Grabbed'),
                    ('dept_task_completed', 'Department Task Completed'),
                    ('dept_task_abandoned', 'Department Task Abandoned'),
                    ('user_verified', 'User Verified'),
                    ('payroll_processed', 'Payroll Processed'),
                    ('contribution_added', 'Contribution Added'),
                    ('contribution_updated', 'Contribution Updated'),
                    ('ot_submitted', 'OT Submitted'),
                    ('ot_fully_approved', 'OT Fully Approved'),
                ],
                max_length=30,
            ),
        ),
    ]
