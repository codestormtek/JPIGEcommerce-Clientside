namespace BlazorApp1.Entities
{
    public class Variation : Entity
    {
        public string Name { get; set; } = default!;
        public ICollection<VariationOption> Options { get; set; } = new List<VariationOption>();
    }



}
