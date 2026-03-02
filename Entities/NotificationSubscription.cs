namespace BlazorApp1.Entities
{
    public class NotificationSubscription : Entity
    {
        public Guid? UserId { get; set; }
        public SiteUser? User { get; set; }
        public string Channel { get; set; } = default!; // inapp|email|sms
        public string EventType { get; set; } = default!;
        public bool IsEnabled { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; }
    }



}
