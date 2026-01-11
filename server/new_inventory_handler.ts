// Simple inventory handler - sends data to React component
handleInventory(entityId: string, entities: Set<Entity>) {
    const player = this.getEntityById(entities, entityId);
    if (!player) return;

    const inventory = player.getComponent(Inventory);
    if (!inventory) return;

    const getItemName = (id: string | null) => {
        if (!id) return "Empty";
        const item = this.getEntityById(entities, id);
        return item?.getComponent(Item)?.name || "Unknown";
    };

    // Equipment Slots
    const backpack = getItemName(inventory.equipment.get('back') || null);
    const torso = getItemName(inventory.equipment.get('torso') || null);
    const legs = getItemName(inventory.equipment.get('legs') || null);
    const waist = getItemName(inventory.equipment.get('waist') || null);
    const leftHand = getItemName(inventory.leftHand);
    const rightHand = getItemName(inventory.rightHand);

    // Backpack Contents
    let backpackContents: string[] = [];
    const backpackId = inventory.equipment.get('back');
    if (backpackId) {
        const backpackEntity = this.getEntityById(entities, backpackId);
        const container = backpackEntity?.getComponent(Container);
        if (container) {
            backpackContents = container.items.map(id => {
                const item = this.getEntityById(entities, id);
                const i = item?.getComponent(Item);
                if (!i) return "Unknown";
                return i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name;
            });
        }
    }

    // Send structured data to client for React component
    this.io.to(entityId).emit('inventory-data', {
        left

Hand,
        rightHand,
        backpack,
        torso,
        legs,
        waist,
        backpackContents
    });

    this.sendInventoryUpdate(entityId, entities);
}
