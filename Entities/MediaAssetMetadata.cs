namespace BlazorApp1.Entities
{
    public class MediaAssetMetadata
    {
        public Guid MediaAssetId { get; set; }
        public MediaAsset MediaAsset { get; set; } = default!;

        public string? MimeType { get; set; }
        public long? FileSizeBytes { get; set; }
        public int? WidthPx { get; set; }
        public int? HeightPx { get; set; }
        public string? ChecksumSha256 { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }



}
