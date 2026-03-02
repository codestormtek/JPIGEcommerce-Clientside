namespace BlazorApp1.Entities
{
    public class ProductAttribute : Entity
    {
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;

        public string Name { get; set; } = default!;

        public ICollection<ProductAttributeValue> Values { get; set; } = new List<ProductAttributeValue>();
    }


}
