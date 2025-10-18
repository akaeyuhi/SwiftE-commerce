# SwiftE-commerce

## What is SwiftE-commerce?

SwiftE-commerce is a comprehensive **AI-powered e-commerce platform** designed for modern retail businesses. Built with enterprise-grade architecture, it combines advanced machine learning capabilities with intelligent content generation to deliver automated inventory management, predictive analytics, and seamless user experiences.

## 🚀 Key Features

### **Core E-commerce Functionality**
- ✅ **User Management**: Complete authentication system with JWT tokens, role-based access control, and email verification
- ✅ **Product Catalog**: Dynamic product management with variants, categories, and advanced search capabilities
- ✅ **Store Management**: Multi-store support with independent inventory and analytics
- ✅ **Shopping Cart**: Real-time cart management with user session persistence
- ✅ **Order Processing**: End-to-end order lifecycle with status tracking, inventory deduction, and shipping management
- ✅ **Review System**: Customer reviews with analytics and moderation capabilities

### **AI-Powered Features**
- 🤖 **Stock Prediction**: Machine learning models predict stockouts 14 days in advance using LightGBM and TensorFlow
- 📊 **Demand Forecasting**: Advanced analytics processing sales patterns, seasonal trends, and market data
- 📈 **Real-time Analytics**: Comprehensive dashboards with product performance and store metrics
- 🎯 **AI Content Generation**: Hugging Face powered text generation for product descriptions, names, and marketing content
- 💡 **Smart Recommendations**: AI-driven product suggestions based on user behavior and purchase history

### **Advanced Architecture**
- 🏗️ **Scalable Backend**: NestJS-based API with modular service architecture
- ⚡ **Queue System**: Redis-based job processing for email notifications and background tasks
- 🔐 **Enterprise Security**: Role-based authorization, data validation, and secure API endpoints
- 📧 **Email Integration**: Automated notifications using SendGrid and Nodemailer
- 🐳 **Docker Support**: Containerized deployment with Kubernetes configurations

## 🛠️ Technology Stack

### **Backend (NestJS)**
- **Framework**: NestJS with TypeScript for robust, scalable server architecture
- **Database**: PostgreSQL with TypeORM for reliable data persistence
- **Caching & Queues**: Redis for session management and background job processing
- **API Documentation**: Swagger/OpenAPI with comprehensive endpoint documentation
- **Testing**: Jest with unit, integration, and e2e testing capabilities

### **AI/ML Services**
- **Stock Predictor**: Python-based FastAPI service with LightGBM and TensorFlow models
- **Content Generator**: Hugging Face API integration for intelligent text generation
- **Data Processing**: Pandas, NumPy, and scikit-learn for feature engineering
- **Model Serving**: Real-time inference with automatic model versioning

### **Frontend (Coming Soon)**
- **Framework**: React.js with TypeScript
- **Styling**: Tailwind CSS and Material-UI components
- **State Management**: Redux Toolkit for predictable state updates
- **Build Tools**: Vite for fast development and optimized builds

## 🏗️ API Architecture Overview

SwiftE-commerce provides a comprehensive REST API with the following major endpoint categories:

### **Authentication & User Management**
- `POST /auth/register` - User registration with email verification
- `POST /auth/login` - JWT-based authentication
- `POST /auth/refresh` - Token refresh mechanism
- `GET /users/{id}` - User profile management
- `POST /users/{id}/stores` - Store creation by users

### **Store & Product Management**
- `GET /stores` - Multi-tenant store listing
- `POST /stores/{storeId}/products` - Product creation with photos
- `GET /stores/{storeId}/products/{productId}/variants` - Product variant management
- `PATCH /stores/{storeId}/products/{productId}/variants/{id}/inventory` - Real-time inventory adjustments
- `POST /stores/{storeId}/products/{productId}/categories` - Category assignment

### **Shopping & Orders**
- `POST /stores/{storeId}/{userId}/cart/get-or-create` - Smart cart management
- `POST /stores/{storeId}/{userId}/cart/{cartId}/items/add` - Add items with quantity control
- `POST /stores/{storeId}/orders/create` - Order creation with automatic inventory deduction
- `PUT /stores/{storeId}/orders/{id}/status` - Order status management
- `POST /stores/{storeId}/orders/{id}/cancel` - Order cancellation with inventory restoration

### **Analytics & Business Intelligence**
- `GET /analytics/stores/{storeId}` - Comprehensive store analytics with time-series data
- `GET /analytics/stores/{storeId}/conversion` - Conversion funnel analysis
- `GET /analytics/stores/{storeId}/products/top` - Top performing products
- `GET /analytics/stores/{storeId}/revenue-trends` - Revenue trend analysis
- `POST /analytics/aggregations` - Custom analytics queries

### **AI-Powered Services**
- `POST /ai/generator/names` - AI-generated product names using Hugging Face models
- `POST /ai/generator/description` - Intelligent product descriptions
- `POST /ai/generator/ideas` - Creative product ideas generation
- `POST /ai/predictor/predict` - Single product demand prediction
- `POST /ai/predictor/predict/batch` - Batch predictions for inventory optimization
- `GET /ai/predictor/stores/{storeId}/trending` - AI-identified trending products

### **Administrative Functions**
- `GET /admin/active` - Active administrator management
- `POST /admin/assign` - Role assignment with email confirmation
- `DELETE /admin/inventory-notifications/cooldowns/{variantId}` - Notification management
- `GET /email/queue/stats` - Email system monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 15+
- Redis 7+
- Python 3.10+ (for AI predictor)
- Hugging Face API key (for content generation)
- Docker & Docker Compose (optional)

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/akaeyuhi/SwiftE-commerce.git
cd SwiftE-commerce
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Update .env with your database, Redis, and Hugging Face API credentials

# Start development server
npm run start:dev
```

#### 3. AI Predictor Setup
```bash
cd predictor
pip install -r requirements.txt

# Train initial model (optional)
python train_model.py --in example_features.csv --model lightgbm --out model/model.bin

# Start predictor service
python serve.py
```

#### 4. Environment Configuration
```bash
# Required environment variables
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=ecommerce_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-secure-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

HUGGINGFACE_API_KEY=your-huggingface-api-key
SENDGRID_API_KEY=your-sendgrid-key

PREDICTOR_URL=http://localhost:8080/predict_batch
```

### 🐳 Docker Deployment

For production deployment with full orchestration:

```bash
# Start all services with Docker Compose
docker-compose up -d

# Services will be available at:
# - Backend API: http://localhost:3000
# - Database Admin: http://localhost:5050
# - AI Predictor: http://localhost:8080
# - Frontend: http://localhost:80 (when implemented)
```

## 📚 API Documentation

Once running, explore the complete API documentation at:
- **Swagger UI**: `http://localhost:3000/api`
- **OpenAPI JSON**: `http://localhost:3000/api-json`

### Key Integration Examples:

#### AI Content Generation
```bash
curl -X POST http://localhost:3000/ai/generator/description \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Wireless Bluetooth Headphones",
    "productSpec": "Over-ear, 30h battery, noise canceling",
    "tone": "professional",
    "storeId": "store-uuid-here"
  }'
```

#### Stock Prediction
```bash
curl -X POST http://localhost:3000/ai/predictor/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productId": "product-uuid",
    "storeId": "store-uuid",
    "features": {
      "sales_7d": 100,
      "inventory_qty": 50,
      "views_7d": 500
    }
  }'
```

#### Analytics Query
```bash
curl -X GET "http://localhost:3000/analytics/stores/STORE_UUID?from=2025-01-01&to=2025-12-31&includeTimeseries=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Testing

### Backend Testing
```bash
cd backend

# Run unit tests
npm run test

# Run integration tests  
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:cov
```

### AI Model Testing
```bash
cd predictor

# Test model training
python train_model.py --in example_features.csv --model lightgbm --test-size 0.2

# Test prediction API
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"features": {"sales_7d": 100, "inventory_qty": 50}}'
```

## 🚀 Deployment

### Production Environment Setup

1. **Environment Variables**:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/ecommerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-secret
HUGGINGFACE_API_KEY=your-huggingface-key
SENDGRID_API_KEY=your-sendgrid-key
```

2. **Database Migration**:
```bash
npm run build
npm run start:prod
```

3. **AI Model Deployment**:
```bash
# Train production model with historical data
python export_features.py --output data/production_features.csv
python train_model.py --in data/production_features.csv --model lightgbm --out model/production_model.bin

# Deploy with Docker
docker build -t swiftecommerce-predictor -f predictor/Dockerfile .
```

## 📊 AI & Analytics Features

### **Machine Learning Pipeline**
1. **Data Export**: Automated feature extraction from PostgreSQL
2. **Model Training**: LightGBM for structured data, TensorFlow for deep learning
3. **Prediction Serving**: FastAPI with real-time model inference
4. **Continuous Learning**: Automated retraining with new data

### **AI Content Generation**
- **Hugging Face Integration**: Leverages state-of-the-art language models for content creation
- **Product Descriptions**: Automatically generate compelling product descriptions
- **Marketing Copy**: Create engaging product names and marketing content
- **Multi-language Support**: Generate content in multiple languages
- **Brand Voice Consistency**: Maintain consistent tone across all generated content

### **Key Predictions**
- **Stockout Risk**: 14-day advance warning with confidence scores
- **Demand Patterns**: Seasonal trends and market behavior analysis
- **Inventory Optimization**: Automated reorder point calculations
- **Customer Behavior**: Purchase prediction and recommendation systems

### **Analytics Dashboard**
- Real-time sales metrics and KPI tracking
- Product performance analysis with drill-down capabilities
- Store comparison and regional insights
- Predictive analytics with actionable recommendations

## 🔧 Development

### **Contributing**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### **Code Quality**
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code style
- **Testing**: Jest with >80% coverage requirement
- **Type Safety**: Strict TypeScript configuration

## 🛣️ Roadmap

### **Phase 1: Core Platform** ✅
- Backend API with comprehensive service architecture
- AI-powered stock prediction system
- Administrative dashboard and user management
- Hugging Face content generation integration

### **Phase 2: Frontend Development** 🚧
- React-based customer storefront
- Admin panel with analytics dashboards
- Mobile-responsive design with PWA support
- Real-time notifications and updates

### **Phase 3: Advanced Features** 📋
- Advanced recommendation engine with collaborative filtering
- Multi-currency and internationalization
- Third-party integrations (payment gateways, shipping)
- Voice and image-based product search

### **Phase 4: Enterprise Features** 🔮
- Multi-tenant SaaS capabilities
- Advanced ML models (customer lifetime value, churn prediction)
- Business intelligence and reporting suite
- Mobile applications (iOS/Android)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support and questions:
- 💬 **GitHub Issues**: [Create an issue](https://github.com/akaeyuhi/SwiftE-commerce/issues)
- 📖 **Documentation**: [Project Wiki](https://github.com/akaeyuhi/SwiftE-commerce/wiki)

---

**Built with ❤️ using modern technologies and AI for the future of e-commerce**
