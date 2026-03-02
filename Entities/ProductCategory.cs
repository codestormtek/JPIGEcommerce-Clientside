namespace BlazorApp1.Entities
{
    public class ProductCategory : Entity
    {
        public string Name { get; set; } = default!;

        public Guid? ParentCategoryId { get; set; }
        public ProductCategory? ParentCategory { get; set; }

        public ICollection<ProductCategory> Children { get; set; } = new List<ProductCategory>();
    }


}
