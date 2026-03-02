namespace BlazorApp1.Entities
{
    public class VariationOption : Entity
    {
        public Guid VariationId { get; set; }
        public Variation Variation { get; set; } = default!;
        public string Value { get; set; } = default!;

        public ICollection<ProductItemOption> ProductItemOptions { get; set; } = new List<ProductItemOption>();
    }



}
