namespace BlazorApp1.Entities
{
    public class ContentPostMedia
    {
        public Guid PostId { get; set; }
        public ContentPost Post { get; set; } = default!;
        public Guid MediaAssetId { get; set; }
        public MediaAsset MediaAsset { get; set; } = default!;
        public int SortOrder { get; set; }
    }



}
