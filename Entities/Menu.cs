namespace BlazorApp1.Entities
{
    public class Menu : AuditableEntity
    {
        public string Name { get; set; } = default!;
        public string MenuType { get; set; } = default!; // catering|truck|event
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }

        public ICollection<MenuSection> Sections { get; set; } = new List<MenuSection>();
    }



}
