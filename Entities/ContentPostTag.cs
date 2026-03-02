namespace BlazorApp1.Entities
{
    public class ContentPostTag
    {
        public Guid PostId { get; set; }
        public ContentPost Post { get; set; } = default!;
        public Guid TagId { get; set; }
        public ContentTag Tag { get; set; } = default!;
    }



}
