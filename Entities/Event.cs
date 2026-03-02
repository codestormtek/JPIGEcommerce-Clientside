namespace BlazorApp1.Entities
{
    public class Event : Entity
    {
        public string EventType { get; set; } = default!;
        public DateTimeOffset OccurredAt { get; set; }
        public Guid? ActorUserId { get; set; }
        public SiteUser? ActorUser { get; set; }
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? DataJson { get; set; }
    }



}
