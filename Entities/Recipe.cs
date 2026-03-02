

namespace BlazorApp1.Entities
{
    public class Recipe
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;

        public List<RecipeIngredient> Ingredients { get; set; } = new();
        public List<RecipeStep> Steps { get; set; } = new();
        public List<RecipeNote> Notes { get; set; } = new();
    }
}
