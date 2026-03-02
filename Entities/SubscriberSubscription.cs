using Microsoft.AspNetCore.Mvc;

namespace BlazorApp1.Entities
{

    public class SubscriberSubscription : AuditableEntity
    {
        public Guid SubscriberId { get; set; }
        public Subscriber Subscriber { get; set; } = default!;

        public string SubscriptionType { get; set; } = default!; // sales|truck_schedule|menu_updates|news
        public Guid? LocationId { get; set; }
        public Location? Location { get; set; }

        public int? RadiusMiles { get; set; }
        public bool IsEnabled { get; set; } = true;
    }



}
