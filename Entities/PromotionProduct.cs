namespace BlazorApp1.Entities
{
    public class PromotionProduct
    {
        public Guid PromotionId { get; set; }
        public Promotion Promotion { get; set; } = default!;

        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;
    }



}
