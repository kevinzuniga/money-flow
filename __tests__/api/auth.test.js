/**
 * Authentication API Tests
 * 
 * Tests for the authentication endpoints, including registration, login,
 * token validation, and user profile management.
 */

const { getTestRequest, randomString } = require('../setup');

describe('Authentication API', () => {
  let request;
  
  beforeAll(() => {
    request = getTestRequest();
  });

  // Test user data
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Password123!',
    nombre: 'Test User'
  };
  
  let authToken;
  let userId;

  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const response = await request
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).toHaveProperty('nombre', testUser.nombre);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      
      // Save token for later tests
      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });
    
    it('should reject registration with duplicate email', async () => {
      const response = await request
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('correo electrónico ya está en uso');
    });
    
    it('should reject registration with invalid email', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toHaveProperty('email');
    });
    
    it('should reject registration with short password', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: `test-${Date.now()}@example.com`,
          password: 'short'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toHaveProperty('password');
    });
    
    it('should reject registration without required fields', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors).toHaveProperty('password');
      expect(response.body.errors).toHaveProperty('nombre');
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      
      // Update token for later tests
      authToken = response.body.data.token;
    });
    
    it('should reject login with invalid email', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('credenciales');
    });
    
    it('should reject login with incorrect password', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password'
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('credenciales');
    });
    
    it('should reject login without required fields', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Token Validation', () => {
    it('should access protected endpoint with valid token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });
    
    it('should reject request with invalid token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should reject request without token', async () => {
      const response = await request
        .get('/api/auth/me')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('User Profile', () => {
    it('should get current user profile', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('nombre', testUser.nombre);
    });
    
    it('should update user profile', async () => {
      const updatedName = `Updated Name ${randomString()}`;
      
      const response = await request
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombre: updatedName })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nombre', updatedName);
      
      // Verify the update persisted
      const verifyResponse = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(verifyResponse.body.data).toHaveProperty('nombre', updatedName);
    });
    
    it('should not update email to one that already exists', async () => {
      // First create another user
      const anotherUser = {
        email: `another-${Date.now()}@example.com`,
        password: 'Password123!',
        nombre: 'Another User'
      };
      
      await request
        .post('/api/auth/register')
        .send(anotherUser)
        .expect(201);
      
      // Try to update original user's email to the new one
      const response = await request
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: anotherUser.email })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('correo electrónico ya está en uso');
    });
    
    it('should change password', async () => {
      const newPassword = 'NewPassword456!';
      
      // Change password
      const response = await request
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword,
          confirmPassword: newPassword
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Try logging in with new password
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);
      
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('token');
    });
    
    it('should reject password change with incorrect current password', async () => {
      const response = await request
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrong-password',
          newPassword: 'NewPassword789!',
          confirmPassword: 'NewPassword789!'
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should successfully logout', async () => {
      const response = await request
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Try using the token after logout (should fail)
      const profileResponse = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
      
      expect(profileResponse.body.success).toBe(false);
    });
  });
});

