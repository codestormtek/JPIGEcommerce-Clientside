namespace BlazorApp1.Entities
{
    public class ScheduleEvent : AuditableEntity
    {
        public Guid LocationId { get; set; }
        public Location Location { get; set; } = default!;

        public Guid? MenuId { get; set; }
        public Menu? Menu { get; set; }

        public string Title { get; set; } = default!;
        public string EventType { get; set; } = default!;  // truck_stop|catering|festival|private
        public string Status { get; set; } = "scheduled"; // scheduled|cancelled|completed

        public DateTimeOffset StartTime { get; set; }
        public DateTimeOffset? EndTime { get; set; }

        public string? Description { get; set; }
        public bool IsPublic { get; set; } = true;

        public ICollection<ScheduleEventMedia> Media { get; set; } = new List<ScheduleEventMedia>();
    }



}
