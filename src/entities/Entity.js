export class Entity {
    constructor(x, y, r) {
        this.x = x;
        this.y = y;
        this.radius = r;
        this.active = true;
    }

    intersects(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (this.radius + other.radius);
    }
}
