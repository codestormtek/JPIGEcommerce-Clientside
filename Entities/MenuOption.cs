namespace BlazorApp1.Entities
{
    public class MenuOption : Entity
    {
        public Guid OptionGroupId { get; set; }
        public MenuOptionGroup OptionGroup { get; set; } = default!;
        public string Name { get; set; } = default!;
        public decimal PriceDelta { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; }
    }



}
