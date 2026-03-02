namespace BlazorApp1.Entities
{
    public class ProductCategoryMap
    {
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;

        public Guid CategoryId { get; set; }
        public ProductCategory Category { get; set; } = default!;

        public int DisplayOrder { get; set; }
        public bool IsPrimary { get; set; }
    }



}
