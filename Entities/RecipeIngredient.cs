namespace BlazorApp1.Entities
{
    public class RecipeIngredient
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid RecipeId { get; set; }

        public string IngredientName { get; set; } = default!;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = "each";
        public int SortOrder { get; set; }
    }
}
