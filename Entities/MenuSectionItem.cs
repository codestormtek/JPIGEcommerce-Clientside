namespace BlazorApp1.Entities
{
    public class MenuSectionItem
    {
        public Guid MenuSectionId { get; set; }
        public MenuSection MenuSection { get; set; } = default!;

        public Guid MenuItemId { get; set; }
        public MenuItem MenuItem { get; set; } = default!;

        public int DisplayOrder { get; set; }
        public decimal? PriceOverride { get; set; }
    }



}
