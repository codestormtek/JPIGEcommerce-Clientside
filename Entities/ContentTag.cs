namespace BlazorApp1.Entities
{
    public class ContentTag : Entity
    {
        public string Name { get; set; } = default!;
        public string Slug { get; set; } = default!;
        public ICollection<ContentPostTag> Posts { get; set; } = new List<ContentPostTag>();
    }



}
