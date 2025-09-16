require("dotenv").config();
const mongoose = require("mongoose");
const Interviewer = require("../models/Interviewer");
const database = require("../config/database");
const logger = require("../utils/logger");

const interviewerData = [
  {
    name: "Sarah Chen",
    role: "Senior Developer",
    avatar: "SC",
    rating: 4.8,
    specialties: ["React", "Node.js", "System Design"],
    experience: "8 years",
    bio: "Senior software engineer with 8+ years of experience in full-stack development. Expert in React, Node.js, and system design. Passionate about mentoring junior developers and building scalable applications.",
    introduction:
      "Hello! I'm Sarah, and I'll be conducting your technical interview today. I have 8 years of experience in full-stack development, and I'm excited to learn about your background and technical skills. Don't worry about getting everything perfect - I'm here to understand your thought process and help you showcase your abilities. Let's start with a brief introduction about yourself and your experience.",
    numberOfInterviewers: 1,
    isActive: true,
  },
  {
    name: "Mike Johnson",
    role: "Tech Lead",
    avatar: "MJ",
    rating: 4.9,
    specialties: ["Python", "AWS", "Architecture"],
    experience: "10 years",
    bio: "Tech Lead with 10+ years of experience in cloud architecture and Python development. Specializes in AWS services, microservices architecture, and team leadership. Known for conducting comprehensive technical interviews.",
    introduction:
      "Hi there! I'm Mike, your interviewer for today. I've been in the tech industry for over 10 years, focusing on cloud architecture and Python development. I believe in creating a comfortable environment where you can demonstrate your skills and problem-solving abilities. I'll be asking you questions about your experience and some technical challenges. Remember, there are no wrong answers - I'm interested in your approach and reasoning. Shall we begin?",
    numberOfInterviewers: 2,
    isActive: true,
  },
  {
    name: "Emily Davis",
    role: "Engineering Manager",
    avatar: "ED",
    rating: 4.7,
    specialties: ["Leadership", "Product Management", "Agile"],
    experience: "12 years",
    bio: "Engineering Manager with 12+ years of experience in software development and team leadership. Expert in agile methodologies, product management, and building high-performing engineering teams.",
    introduction:
      "Good day! I'm Emily, and I'll be your interviewer today. With 12 years in software development and team leadership, I'm particularly interested in understanding your technical background and how you approach leadership challenges. This interview will cover both technical skills and soft skills. I want to create an open dialogue where you can share your experiences and aspirations. Let's start with you telling me about your journey in technology so far.",
    numberOfInterviewers: 1,
    isActive: true,
  },
  {
    name: "Alex Kumar",
    role: "Full Stack Developer",
    avatar: "AK",
    rating: 4.6,
    specialties: ["JavaScript", "React", "MongoDB"],
    experience: "6 years",
    bio: "Full Stack Developer with 6+ years of experience in modern web technologies. Expert in JavaScript, React, and MongoDB. Passionate about clean code and best practices in software development.",
    introduction:
      "Hello! I'm Alex, and I'm thrilled to be your interviewer today. I'm a full-stack developer with 6 years of experience in modern web technologies. I'm passionate about clean code and best practices, and I love discussing technical challenges with fellow developers. Today, we'll explore your technical skills and problem-solving approach. Don't hesitate to ask questions or clarify anything - this is a collaborative conversation. Let's start with a quick overview of your background.",
    numberOfInterviewers: 1,
    isActive: true,
  },
  {
    name: "Lisa Wang",
    role: "Senior Engineer",
    avatar: "LW",
    rating: 4.8,
    specialties: ["Java", "Spring", "Microservices"],
    experience: "9 years",
    bio: "Senior Engineer with 9+ years of experience in Java development and microservices architecture. Expert in Spring framework, distributed systems, and enterprise application development.",
    introduction:
      "Hi! I'm Lisa, and I'll be conducting your technical interview today. I have 9 years of experience in Java development and microservices architecture. I'm particularly interested in understanding your technical depth and how you approach complex system design problems. This interview will be a mix of technical questions and system design discussions. I want to make sure you feel comfortable and can showcase your best work. Let's begin with you introducing yourself and your technical background.",
    numberOfInterviewers: 2,
    isActive: true,
  },
];

const seedInterviewers = async () => {
  try {
    // Connect to database
    await database.connect();
    logger.info("Connected to database for seeding");

    // Clear existing interviewers
    await Interviewer.deleteMany({});
    logger.info("Cleared existing interviewers");

    // Insert new interviewers
    const interviewers = await Interviewer.insertMany(interviewerData);
    logger.info(`Successfully seeded ${interviewers.length} interviewers`);

    // Log the seeded data
    interviewers.forEach((interviewer) => {
      logger.info(
        `Seeded interviewer: ${interviewer.name} (${interviewer.role})`
      );
    });

    console.log("✅ Interviewers seeded successfully!");
    console.log(`📊 Total interviewers: ${interviewers.length}`);

    process.exit(0);
  } catch (error) {
    logger.error("Error seeding interviewers:", error);
    console.error("❌ Error seeding interviewers:", error.message);
    process.exit(1);
  }
};

// Run the seeding function
seedInterviewers();


