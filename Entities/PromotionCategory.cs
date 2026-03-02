namespace BlazorApp1.Entities
{
    public class PromotionCategory
    {
        public Guid PromotionId { get; set; }
        public Promotion Promotion { get; set; } = default!;

        public Guid CategoryId { get; set; }
        public ProductCategory Category { get; set; } = default!;
    }



}
