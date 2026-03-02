namespace BlazorApp1.Entities
{
    public class ProductMedia
    {
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;

        public Guid MediaAssetId { get; set; }
        public MediaAsset MediaAsset { get; set; } = default!;

        public int SortOrder { get; set; }
        public bool IsPrimary { get; set; }
    }



}
