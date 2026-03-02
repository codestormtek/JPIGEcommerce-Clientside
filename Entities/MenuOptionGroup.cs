namespace BlazorApp1.Entities
{
    public class MenuOptionGroup : Entity
    {
        public Guid MenuItemId { get; set; }
        public MenuItem MenuItem { get; set; } = default!;
        public string Name { get; set; } = default!;
        public int MinSelect { get; set; }
        public int MaxSelect { get; set; }
        public bool IsRequired { get; set; }
        public int DisplayOrder { get; set; }

        public ICollection<MenuOption> Options { get; set; } = new List<MenuOption>();
    }



}
