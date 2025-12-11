# SwiftShop E-commerce Platform

[![NestJS](https://img.shields.io/badge/backend-NestJS-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/frontend-React-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/deployment-Docker-2496ED.svg)](https://www.docker.com/)

> A full-stack, production-ready e-commerce application demonstrating scalable modular architecture, secure authentication, and complex database modeling.

---

## 📖 Overview

This project was built to demonstrate advanced Fullstack capabilities, focusing on a clean separation of concerns between the client and server.

The **Backend** is built with NestJS, utilizing a modular architecture following Domain-Driven Design principles. It uses TypeORM for PostgreSQL interactions and implements strict DTO validation.

The **Frontend** is a responsive React application built with modern hooks and context API for state management, communicating with the backend via RESTful APIs.

### Key Features

* **Modular Architecture:** Scalable NestJS backend organized by feature modules (Users, Products, Orders, Auth).
* **Secure Authentication:** JWT-based auth using Passport.js strategies.
* **RBAC (Role-Based Access Control):** Guards ensuring distinct permissions for Admins, Vendors, and Customers.
* **Complex Data Modeling:** PostgreSQL schema handling many-to-many relationships (e.g., Orders <-> Products).
* **State Management:** React Context API and custom hooks for efficient frontend data handling.
* **Dockerized Environment:** Full development environment setup using Docker Compose.

---

## 🏗️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Server Runtime** | Node.js (v18+) |
| **Backend Framework** | NestJS |
| **Database** | PostgreSQL 15 |
| **ORM** | TypeORM |
| **Frontend Library** | React 19 |
| **Styling** | SCSS / Tailwind CSS |
| **Containerization** | Docker & Docker Compose |

---

## 🚀 Getting Started

The easiest way to run this project locally is using Docker Compose.

### Prerequisites

* Docker and Docker Compose installed on your machine.

### Installation Steps

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/akaeyuhi/SwiftE-commerce.git](https://github.com/akaeyuhi/SwiftE-commerce.git)
    cd SwiftE-commerce
    ```

2.  **Environment Setup**
    Duplicate the `.env.example` file and rename it to `.env`. The default values should work for the Docker setup.
    ```bash
    cp .env.example .env
    ```

3.  **Build and Run with Docker Compose**
    This command will build the images for frontend, backend, and database, and start the containers.
    ```bash
    docker-compose up --build -d
    ```

4.  **Access the Application**
    Once the containers are running:

    * **Frontend:** [http://localhost:5173](http://localhost:5173)
    * **Backend API:** [http://localhost:3000/api](http://localhost:3000/api)
    * **API Documentation (Swagger):** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---
