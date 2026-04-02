using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Controllers;

/// <summary>
/// Products API - for load testing product catalog operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly SampleDataStore _store;

    public ProductsController(SampleDataStore store) => _store = store;

    /// <summary>
    /// GET /api/products - List products with pagination and filtering
    /// </summary>
    [HttpGet]
    public IActionResult GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null,
        [FromQuery] double? minPrice = null,
        [FromQuery] double? maxPrice = null)
    {
        var products = _store.Products.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(category))
            products = products.Where(p => p.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        if (minPrice.HasValue)
            products = products.Where(p => p.Price >= minPrice.Value);
        if (maxPrice.HasValue)
            products = products.Where(p => p.Price <= maxPrice.Value);

        var list = products.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Ok(new { items = paged, total = list.Count, page, pageSize });
    }

    /// <summary>
    /// GET /api/products/{id} - Get product by ID
    /// </summary>
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var product = _store.GetProduct(id);
        if (product == null) return NotFound(new { error = "Product not found" });
        return Ok(product);
    }

    /// <summary>
    /// GET /api/products/categories - List categories
    /// </summary>
    [HttpGet("categories")]
    public IActionResult GetCategories()
    {
        var categories = _store.Products.Select(p => p.Category).Distinct().OrderBy(c => c).ToList();
        return Ok(categories);
    }

    /// <summary>
    /// GET /api/products/search?q=term - Search products
    /// </summary>
    [HttpGet("search")]
    public IActionResult Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(Array.Empty<ProductRecord>());
        var results = _store.Products
            .Where(p => p.Name.Contains(q, StringComparison.OrdinalIgnoreCase)
                     || p.Category.Contains(q, StringComparison.OrdinalIgnoreCase))
            .ToList();
        return Ok(results);
    }
}

