namespace BlazorApp1.Entities
{
    public class ProductItemOption
    {
        public Guid ProductItemId { get; set; }
        public ProductItem ProductItem { get; set; } = default!;

        public Guid VariationOptionId { get; set; }
        public VariationOption VariationOption { get; set; } = default!;
    }



}
