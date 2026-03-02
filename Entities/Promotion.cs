namespace BlazorApp1.Entities
{
    public class Promotion : Entity
    {
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string PromotionType { get; set; } = default!; // percent|fixed|free_shipping
        public decimal? DiscountRate { get; set; }
        public decimal? MinSubtotal { get; set; }
        public bool Stackable { get; set; }
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();
        public ICollection<PromotionCategory> Categories { get; set; } = new List<PromotionCategory>();
        public ICollection<PromotionProduct> Products { get; set; } = new List<PromotionProduct>();
    }



}
