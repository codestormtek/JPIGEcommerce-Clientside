namespace BlazorApp1.Entities
{
    public class ProductItem : Entity
    {
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;

        public string Sku { get; set; } = default!;
        public string? Barcode { get; set; }

        public decimal Price { get; set; }
        public int QtyInStock { get; set; }

        public decimal? Weight { get; set; }
        public decimal? Length { get; set; }
        public decimal? Width { get; set; }
        public decimal? Height { get; set; }

        public bool IsPublished { get; set; } = true;

        public ICollection<ProductItemOption> Options { get; set; } = new List<ProductItemOption>();
    }



}
