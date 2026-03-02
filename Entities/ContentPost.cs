namespace BlazorApp1.Entities
{
    public class ContentPost : AuditableEntity
    {
        public Guid AuthorUserId { get; set; }
        public SiteUser AuthorUser { get; set; } = default!;

        public string PostType { get; set; } = default!; // blog|news
        public string Title { get; set; } = default!;
        public string Slug { get; set; } = default!;
        public string? Excerpt { get; set; }
        public string BodyHtml { get; set; } = default!;
        public string Status { get; set; } = default!;   // draft|scheduled|published|archived
        public Guid? FeaturedMediaAssetId { get; set; }
        public MediaAsset? FeaturedMediaAsset { get; set; }
        public DateTimeOffset? PublishedAt { get; set; }

        public ICollection<ContentPostCategory> Categories { get; set; } = new List<ContentPostCategory>();
        public ICollection<ContentPostTag> Tags { get; set; } = new List<ContentPostTag>();
        public ICollection<ContentPostMedia> Media { get; set; } = new List<ContentPostMedia>();
    }



}
