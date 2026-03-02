namespace BlazorApp1.Entities
{
    /* Anonymous subscribers */
    public class Subscriber : AuditableEntity
    {
        public Guid? UserId { get; set; }
        public SiteUser? User { get; set; }

        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Zip { get; set; }

        public bool OptInEmail { get; set; }
        public bool OptInSms { get; set; }

        public DateTimeOffset? ConfirmedAt { get; set; }

        public ICollection<SubscriberSubscription> Subscriptions { get; set; } = new List<SubscriberSubscription>();
    }



}
