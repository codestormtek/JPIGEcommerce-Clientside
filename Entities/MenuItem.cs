namespace BlazorApp1.Entities
{
    public class MenuItem : AuditableEntity
    {
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;

        public string PricingModel { get; set; } = default!; // each|per_person|tray|market
        public decimal? BasePrice { get; set; }

        public Guid? MediaAssetId { get; set; }
        public MediaAsset? MediaAsset { get; set; }

        public int? PrepTimeMinutes { get; set; }

        public ICollection<MenuOptionGroup> OptionGroups { get; set; } = new List<MenuOptionGroup>();
        public ICollection<MenuSectionItem> Sections { get; set; } = new List<MenuSectionItem>();

        public ICollection<MenuItemProductMap> ProductMaps { get; set; } = new List<MenuItemProductMap>();
    }



}
