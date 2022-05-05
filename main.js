/** @type {HTMLCanvasElement} */
var canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
var ctx = canvas.getContext("2d");

var canvasWidth = 800;
var canvasHeight = 600;

var mousePosition;
var mouseDown;
var mouseDownPosition;

var initialRay;
var maxBounces = 6;

var rayHue = 0;
var hueShift = 0;


document.addEventListener("mousemove", (e) => {
    var bounds = canvas.getBoundingClientRect();
    
    mousePosition = new vector2(e.clientX - bounds.left, (e.clientY - bounds.top - canvasHeight)*-1);
    mousePosition = vector2.clamp(mousePosition, new vector2(0, 0), new vector2(canvasWidth, canvasHeight));
    mousePosition = vector2.parseVector2Int(mousePosition);

    initialRay.dir = vector2.angle(mouseDownPosition, mousePosition);
}, false);

canvas.addEventListener("mousedown", (e) => {
    if (e.button == 0) {
        mouseDown = true;
        mouseDownPosition = new vector2(mousePosition.x, mousePosition.y);
    }
}, false);

document.addEventListener("mouseup", (e) => {
    if (e.button == 0) {
        mouseDown = false;
    }
}, false);

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
}, false);


function start() {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.translate(0, canvasHeight);
    ctx.scale(1, -1);

    ctx.lineWidth = 2;

    mousePosition = new vector2();
    mouseDownPosition = new vector2();

    // Raycast
    initialRay = new rayCast();

    // Walls
    new wall(new vector2(0, 0), new vector2(400, 200));
    new wall(new vector2(400, 300), new vector2(200, 400));
    new wall(new vector2(700, canvasHeight), new vector2(700, 0));
    new wall(new vector2(0, 0), new vector2(0, canvasHeight));
    new wall(new vector2(0, canvasHeight), new vector2(canvasWidth, canvasHeight));
    new wall(new vector2(canvasWidth, canvasHeight), new vector2(canvasWidth, 0));
    new wall(new vector2(0, 0), new vector2(canvasWidth, 0));

    update();
}

function update() {
    setInterval(() => {
        if (!document.hasFocus) mouseDown = false;

        calc();
        draw();
    }, 1000/60);
}

function calc() {
    if (initialRay.dir) initialRay = new rayCast(mouseDownPosition, initialRay.dir);
}

function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    rayHue = 0;

    // Draw walls
    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
    wall.list.forEach(wall => {
        ctx.beginPath();
        ctx.moveTo(wall.a.x, wall.a.y);
        ctx.lineTo(wall.b.x, wall.b.y);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        drawCircle(wall.a, 10, true);
        ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
        drawCircle(wall.b, 10, true);
    }); 

    // Draw initial raycast
    ctx.strokeStyle = `hsla(${rayHue}, 100%, 50%, 0.5)`;
    ctx.beginPath();
    ctx.moveTo(initialRay.origin.x, initialRay.origin.y);
    ctx.lineTo(initialRay.hit.position.x, initialRay.hit.position.y);
    ctx.stroke();
    
    // Calc and draw bounce raycasts
    var bounces = 0;
    var currentRay = initialRay;
    while (bounces < maxBounces) {
        rayHue+=hueShift;
        if (currentRay.hit.wall) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
            var normalPoint = vector2.pointFromDir(currentRay.hit.position, deg2Rad(currentRay.hit.wall.normal(currentRay.origin)-90), 100);
            
            ctx.strokeStyle = `hsla(${rayHue}, 100%, 50%, 0.5)`;
            // Get angle from bounce
            var a = deg2Rad(currentRay.hit.wall.normal(currentRay.origin)-90 + lineAngle(currentRay.origin, currentRay.hit.position, normalPoint, currentRay.hit.position));
    
            // Get bounce dir (L/R)
            var reflect = clampDir(rad2Deg(a)).toFixed(1) == clampDir(currentRay.dir+180).toFixed(1) ? -1 : 1;
            
            // Get max hit from bounce angle (account for reflection)
            var targetPoint = vector2.pointFromDir(currentRay.hit.position, a, 200);
            if (reflect == -1) targetPoint = vector2.reflect(targetPoint, currentRay.hit.position, normalPoint);
            
            // Draw max hit
            if (targetPoint) {
                let bounceRay = new rayCast(currentRay.hit.position, vector2.angle(currentRay.hit.position, targetPoint), Math.hypot(canvasWidth, canvasHeight), currentRay.hit.wall);

                ctx.beginPath();
                ctx.moveTo(bounceRay.origin.x, bounceRay.origin.y);
                ctx.lineTo(bounceRay.hit.position.x, bounceRay.hit.position.y);
                ctx.stroke();

                currentRay = bounceRay;
            } else {
                console.warn("Invalid reflect direction");
            }
        } else {
            break;
        }
        bounces++;
    }
}

function drawCircle(position, radius, fill = false) {
    ctx.beginPath();
    ctx.ellipse(position.x, position.y, radius, radius, Math.PI/4, 0, 2*Math.PI);
    if (fill) {
        ctx.fill();
        return;
    }
    ctx.stroke();
}

// Google Unit Converter --> Plane Angle --> Degree to Radian
function deg2Rad(deg) {
    return deg * Math.PI/180;
}

// Google Unit Converter --> Plane Angle --> Degree to Radian
function rad2Deg(rad) {
    return rad * 180/Math.PI;
}

// https://www.wyzant.com/resources/answers/607711/determine-which-side-of-a-line-a-point-lies
function getSide(point, a, b) {
    return Math.sign((point.x-a.x)*(b.y-a.y)-(point.y-a.y)*(b.x-a.x));
}

function clampDir(dir) {
    var result = dir;
    if (dir < 0) result = dir+360;
    if (dir > 360) result = dir-360;
    return result;
}

// https://stackoverflow.com/questions/42159032/how-to-find-angle-between-two-straight-lines-paths-on-a-svg-in-javascript
function lineAngle(a1, a2, b1, b2)  {
    var dA = new vector2();
    var dB = new vector2();
    dA.x = a2.x - a1.x;
    dA.y = a2.y - a1.y;
    dB.x = b2.x - b1.x;
    dB.y = b2.y - b1.y;
    var angle = Math.atan2(dA.x * dB.y - dA.y * dB.x, dA.x * dB.x + dA.y * dB.y);
    if (angle < 0) angle = angle * -1;
    var theta = angle * (180 / Math.PI);
    return theta;
}

class wall {
    static list = [];

    constructor(a = new vector2(), b = new vector2()) {
        this.a = a;
        this.b = b;

        wall.list.push(this);
    }

    normal(context) {
        if (getSide(context, this.a, this.b) == 1) {
            return vector2.angle(this.a, this.b);
        } else {
            return vector2.angle(this.b, this.a);
        }
    }

    compare(target) {
        var match = 0;
        if (this.a.x == target.a.x) match++;
        if (this.a.y == target.a.y) match++;
        if (this.b.x == target.b.x) match++;
        if (this.b.y == target.b.y) match++;
        if (match == 4) return true;
        return false;
    }
}

class rayCast {
    hit = {
        wall: null,
        position: null
    };

    constructor(origin = new vector2(), dir, dist = Math.hypot(canvasWidth, canvasHeight), ignoreWall = null) {
        this.origin = origin;
        this.dir = dir;
        this.dist = dist;
        this.ignoreWall = ignoreWall;
        rayCast.getData(this);
    }

    static getData(ray) {
        ray.hit.position = vector2.pointFromDir(ray.origin, deg2Rad(ray.dir), ray.dist); // Set default position (length of this.dist)
        var rayLine = {a: ray.origin, b: ray.hit.position}; // Define rayCast line

        var closestHit = Infinity;
        var closestWall = null;
        for (let index = 0; index < wall.list.length; index++) {
            if (vector2.isIntersecting(rayLine.a, rayLine.b, wall.list[index].a, wall.list[index].b)) {
                let subjectPosition = vector2.getIntersect(rayLine.a, rayLine.b, wall.list[index].a, wall.list[index].b);
                if (vector2.distance(ray.origin, subjectPosition) < closestHit) {
                    if (ray.ignoreWall) if (wall.list[index].compare(ray.ignoreWall)) continue;
                    ray.hit.position = subjectPosition;
                    closestHit = vector2.distance(ray.origin, subjectPosition);
                    closestWall = wall.list[index];
                }
            }
        }
        ray.hit.wall = closestWall;
    }
}

class vector2 {
    constructor(x = 0, y = 0) {
        this.x = parseFloat(x.toFixed(3));
        this.y = parseFloat(y.toFixed(3));
    }

    static parseVector2Int(current) {
        var target = new vector2();
        target.x = parseInt(current.x);
        target.y = parseInt(current.y);
        return target;
    }

    static distance(v1, v2) {
        var diff_x = v1.x - v2.x;
        var diff_y = v1.y - v2.y;
        return parseFloat(Math.sqrt(diff_x * diff_x + diff_y * diff_y));
    }

    static angle(current, target) {
        var dx = target.x - current.x;
        var dy = target.y - current.y;
        var theta = Math.atan2(dy, dx); // range (-PI, PI]
        theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        if (theta < 0) theta = 360 + theta; // range [0, 360)
        return theta;
    }

    static clamp(current, min = new vector2(1, 1), max = new vector2(1, 1)) {
        if (current.x < min.x) current.x = min.x;
        if (current.y < min.y) current.y = min.y;
        if (current.x > max.x) current.x = max.x;
        if (current.y > max.y) current.y = max.y;
        return current;
    }

    // https://www.quora.com/How-can-I-calculate-the-other-coordinates-of-a-point-when-given-the-origin-and-the-distance-of-a-line
    static pointFromDir(origin = new vector2(), dir = 0, dist = 10) {
        var dx = origin.x + (dist * Math.cos(dir));
        var dy = origin.y + (dist * Math.sin(dir));
        return new vector2(dx, dy);
    }

    // https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
    static isIntersecting(v1, v2, v3, v4) {
        function CCW(v1, v2, v3) {
            return (v3.y - v1.y) * (v2.x - v1.x) >= (v2.y - v1.y) * (v3.x - v1.x);
        }
        return (CCW(v1, v3, v4) != CCW(v2, v3, v4)) && (CCW(v1, v2, v3) != CCW(v1, v2, v4));
    }

    // https://stackoverflow.com/questions/13937782/calculating-the-point-of-intersection-of-two-lines
    static getIntersect(v1, v2, v3, v4) {
        var ua, ub, denom = (v4.y - v3.y)*(v2.x - v1.x) - (v4.x - v3.x)*(v2.y - v1.y);
        if (denom == 0)  return null;
        ua = ((v4.x - v3.x)*(v1.y - v3.y) - (v4.y - v3.y)*(v1.x - v3.x))/denom;
        ub = ((v2.x - v1.x)*(v1.y - v3.y) - (v2.y - v1.y)*(v1.x - v3.x))/denom;
        return new vector2(v1.x + ua * (v2.x - v1.x), v1.y + ua * (v2.y - v1.y));
    }

    // https://gist.github.com/balint42/b99934b2a6990a53e14b
    static reflect(p, p0, p1) {
        var dx, dy, a, b, x, y;

        dx = p1.x - p0.x;
        dy = p1.y - p0.y;
        a = (dx * dx - dy * dy) / (dx * dx + dy * dy);
        b = 2 * dx * dy / (dx * dx + dy * dy);
        x = Math.round(a * (p.x - p0.x) + b * (p.y - p0.y) + p0.x); 
        y = Math.round(b * (p.x - p0.x) - a * (p.y - p0.y) + p0.y);

        return new vector2(x, y);
    }
}

start();
