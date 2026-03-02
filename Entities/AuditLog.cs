namespace BlazorApp1.Entities
{
    public class AuditLog : Entity
    {
        public Guid? UserId { get; set; }
        public SiteUser? User { get; set; }

        public string Action { get; set; } = default!;
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? BeforeJson { get; set; }
        public string? AfterJson { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }



}
