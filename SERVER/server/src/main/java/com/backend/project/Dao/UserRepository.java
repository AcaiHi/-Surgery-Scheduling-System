package com.backend.project.Dao;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.project.model.User;

public interface UserRepository extends JpaRepository<User, String>{
    Optional<User> findByUsername(String username);
}
