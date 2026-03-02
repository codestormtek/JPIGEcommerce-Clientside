namespace BlazorApp1.Entities
{
    public class PromotionUsage : Entity
    {
        public Guid PromotionId { get; set; }
        public Promotion Promotion { get; set; } = default!;

        public Guid OrderId { get; set; }
        public ShopOrder Order { get; set; } = default!;

        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public DateTimeOffset UsedAt { get; set; }
    }



}
