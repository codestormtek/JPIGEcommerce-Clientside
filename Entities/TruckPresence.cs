namespace BlazorApp1.Entities
{
    /* Real-time rig location */
    public class TruckPresence : Entity
    {
        public string Name { get; set; } = default!;
        public bool IsActive { get; set; } = true;

        public ICollection<TruckLocationPing> Pings { get; set; } = new List<TruckLocationPing>();
    }



}
