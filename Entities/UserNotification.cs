namespace BlazorApp1.Entities
{
    public class UserNotification : Entity
    {
        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public Guid? EventId { get; set; }
        public Event? Event { get; set; }

        public string Title { get; set; } = default!;
        public string? Message { get; set; }
        public string? Url { get; set; }
        public bool IsRead { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? ReadAt { get; set; }
    }



}
