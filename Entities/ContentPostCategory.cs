namespace BlazorApp1.Entities
{
    public class ContentPostCategory
    {
        public Guid PostId { get; set; }
        public ContentPost Post { get; set; } = default!;
        public Guid CategoryId { get; set; }
        public ContentCategory Category { get; set; } = default!;
    }



}
