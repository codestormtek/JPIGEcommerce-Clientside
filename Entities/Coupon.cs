namespace BlazorApp1.Entities
{
    public class Coupon : AuditableEntity
    {
        public string Code { get; set; } = default!;
        public decimal DiscountAmount { get; set; }
        public decimal? Percentage { get; set; }

        public DateTimeOffset? ExpirationDate { get; set; }
        public int? UsageLimit { get; set; }
        public int TimesUsed { get; set; }
    }


}
