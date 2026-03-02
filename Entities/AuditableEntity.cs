namespace BlazorApp1.Entities
{
    public abstract class AuditableEntity : Entity
    {
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid? CreatedBy { get; set; }

        public DateTimeOffset? LastModifiedAt { get; set; }
        public Guid? LastModifiedBy { get; set; }

        public bool IsDeleted { get; set; }
    }



}
