namespace BlazorApp1.Entities
{
    public class RecipeNote
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid RecipeId { get; set; }

        public string Note { get; set; } = default!;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
