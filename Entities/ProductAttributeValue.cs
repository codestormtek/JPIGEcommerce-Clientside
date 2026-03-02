namespace BlazorApp1.Entities
{
    public class ProductAttributeValue : Entity
    {
        public Guid ProductAttributeId { get; set; }
        public ProductAttribute ProductAttribute { get; set; } = default!;

        public string Value { get; set; } = default!;
        public decimal? PriceAdjustment { get; set; }
    }


}
