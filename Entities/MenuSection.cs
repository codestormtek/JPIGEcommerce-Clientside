namespace BlazorApp1.Entities
{
    public class MenuSection : Entity
    {
        public Guid MenuId { get; set; }
        public Menu Menu { get; set; } = default!;
        public string Name { get; set; } = default!;
        public int DisplayOrder { get; set; }

        public ICollection<MenuSectionItem> Items { get; set; } = new List<MenuSectionItem>();
    }



}
