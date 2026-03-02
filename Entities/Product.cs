namespace BlazorApp1.Entities
{
    public class Product : AuditableEntity
    {
        public string Name { get; set; } = default!;
        public string? Description { get; set; }

        public decimal Price { get; set; }
        public int Quantity { get; set; }

        public Guid? BrandId { get; set; }
        public Brand? Brand { get; set; }

        public ICollection<ProductAttribute> Attributes { get; set; } = new List<ProductAttribute>();
    }


}
