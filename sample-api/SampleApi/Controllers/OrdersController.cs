using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Controllers;

/// <summary>
/// Orders API - for load testing order processing
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly SampleDataStore _store;

    public OrdersController(SampleDataStore store) => _store = store;

    /// <summary>
    /// GET /api/orders - List all orders
    /// </summary>
    [HttpGet]
    public IActionResult GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var orders = _store.Orders;
        var paged = orders.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Ok(new { items = paged, total = orders.Count, page, pageSize });
    }

    /// <summary>
    /// GET /api/orders/{id} - Get order by ID
    /// </summary>
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var order = _store.GetOrder(id);
        if (order == null) return NotFound(new { error = "Order not found" });
        return Ok(order);
    }

    /// <summary>
    /// POST /api/orders - Place a new order
    /// </summary>
    [HttpPost]
    public IActionResult Create([FromBody] CreateOrderRequest request)
    {
        if (request.UserId <= 0)
            return BadRequest(new { error = "Valid UserId is required" });
        if (request.ProductIds == null || request.ProductIds.Count == 0)
            return BadRequest(new { error = "At least one product is required" });

        // Calculate total from products
        double total = 0;
        foreach (var pid in request.ProductIds)
        {
            var product = _store.GetProduct(pid);
            if (product == null) return BadRequest(new { error = $"Product {pid} not found" });
            total += product.Price;
        }

        var order = _store.AddOrder(request.UserId, request.ProductIds, Math.Round(total, 2));
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    /// <summary>
    /// GET /api/orders/user/{userId} - Get orders by user
    /// </summary>
    [HttpGet("user/{userId}")]
    public IActionResult GetByUser(int userId)
    {
        var orders = _store.Orders.Where(o => o.UserId == userId).ToList();
        return Ok(orders);
    }
}

public class CreateOrderRequest
{
    public int UserId { get; set; }
    public List<int> ProductIds { get; set; } = new();
}

