namespace BlazorApp1.Entities
{
    public class ContentCategory : Entity
    {
        public string Name { get; set; } = default!;
        public string Slug { get; set; } = default!;
        public ICollection<ContentPostCategory> Posts { get; set; } = new List<ContentPostCategory>();
    }



}
