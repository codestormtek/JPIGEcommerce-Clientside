namespace BlazorApp1.Entities
{
    public class MediaAsset : AuditableEntity
    {
        public string Url { get; set; } = default!;
        public string? AltText { get; set; }
        public string MediaType { get; set; } = "image"; // image|video

        public MediaAssetMetadata? Metadata { get; set; }
        public ICollection<ProductMedia> ProductMedia { get; set; } = new List<ProductMedia>();
    }



}
