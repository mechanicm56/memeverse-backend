const { default: mongoose } = require("mongoose");
const LikeDislike = require("../models/like_dislike.model");
const Meme = require("../models/meme.model");

const getLikedMemes = async (req, res) => {
  try {
    const { id } = req.query;
    const userLikesAggregation = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(id), // actual userId
          type: "like",
        },
      },
      {
        $lookup: {
          from: "memes", // The name of the Meme collection in MongoDB
          localField: "memeId",
          foreignField: "_id",
          as: "memeDetails",
        },
      },
      {
        $unwind: "$memeDetails", // Unwind the array created by $lookup to get individual meme details
      },
      {
        $project: {
          _id: 0, // Exclude the _id of the likeDislike document
          memeId: "$memeId",
          name: "$memeDetails.name",
          url: "$memeDetails.url",
          width: "$memeDetails.width",
          height: "$memeDetails.height",
          box_count: "$memeDetails.box_count",
          likes: "$memeDetails.likes", // You can also fetch the meme's likes count
          dislikes: "$memeDetails.dislikes", // You can fetch the meme's dislikes count
          createdAt: 1, // Include the timestamp for when the like was created
        },
      },
    ];

    const memes = await LikeDislike.aggregate(userLikesAggregation);
    // console.log(memes);
    return res.status(200).json({
      message: "",
      memes: memes,
    });
  } catch (err) {
    return res.status(200).json({
      message: "Internal Server Error",
    });
  }
};

const getUserMemes = async (req, res) => {
  try {
    const { userId } = req.query; // Replace with the specific user ID

    const memes = await Meme.find({ user: userId }).populate({
      path: "comments",
      select: "user content createdAt",
      populate: {
        path: "user",
        Model: "User",
        select: "name email",
      },
    });

    return res.status(200).json({
      message: "Memes by user",
      memes: memes,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getUsersRatings = async (req, res) => {
  try {
    const users = await Meme.aggregate([
      {
        $group: {
          _id: "$user", // Group by user (the user who uploaded the meme)
          totalMemes: { $sum: 1 }, // Count the number of memes per user
          totalLikes: { $sum: "$likes" }, // Sum the total likes for each user's memes
        },
      },
      {
        $lookup: {
          from: "comments", // Lookup to get the comments collection
          localField: "_id", // The user id from the memes
          foreignField: "user", // The user field in the comments collection
          as: "userComments", // Add comments to the results as 'userComments'
        },
      },
      {
        $project: {
          _id: 1, // User id
          totalMemes: 1,
          totalLikes: 1,
          totalComments: { $size: "$userComments" }, // Count the number of comments per user
        },
      },
      {
        $addFields: {
          maxMemes: { $max: "$totalMemes" }, // Find the maximum memes uploaded by any user
          maxLikes: { $max: "$totalLikes" }, // Find the maximum likes across all memes
          maxComments: { $max: "$totalComments" }, // Find the maximum comments made by any user
        },
      },
      {
        $lookup: {
          from: "users", // Lookup to get the user details from the 'users' collection
          localField: "_id", // The user id from the memes
          foreignField: "_id", // The user _id field in the 'users' collection
          as: "userDetails", // Add user details to the results as 'userDetails'
        },
      },
      {
        $unwind: "$userDetails", // Unwind to flatten the userDetails array
      },
      {
        $addFields: {
          // Normalize each metric by dividing by the maximum value, handle division by zero
          normalizedMemes: {
            $cond: {
              if: { $eq: ["$maxMemes", 0] },
              then: 0,
              else: { $divide: ["$totalMemes", "$maxMemes"] },
            },
          },
          normalizedLikes: {
            $cond: {
              if: { $eq: ["$maxLikes", 0] },
              then: 0,
              else: { $divide: ["$totalLikes", "$maxLikes"] },
            },
          },
          normalizedComments: {
            $cond: {
              if: { $eq: ["$maxComments", 0] },
              then: 0,
              else: { $divide: ["$totalComments", "$maxComments"] },
            },
          },
        },
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ["$normalizedMemes", 0.33] }, // Weight for memes
              { $multiply: ["$normalizedLikes", 0.33] }, // Weight for likes
              { $multiply: ["$normalizedComments", 0.34] }, // Weight for comments
            ],
          },
        },
      },
      {
        $addFields: {
          rating: { $round: [{ $multiply: ["$engagementScore", 5] }, 1] }, // Scale the final score to be out of 5
        },
      },
      {
        $project: {
          _id: 1,
          avatar: "$userDetails.avatar",
          name: "$userDetails.name", // Include user name from userDetails
          email: "$userDetails.email", // Include user email from userDetails
          totalMemes: 1,
          totalLikes: 1,
          totalComments: 1,
          rating: 1, // The final rating out of 5
        },
      },
      {
        $sort: { rating: -1 }, // Sort by the highest rating (descending)
      },
      {
        $limit: 10, // Limit to the most engaging user (you can remove or adjust this if you want the top N users)
      },
    ]);

    return res.status(200).json({
      message: "User Rating by engaging with memes",
      users: users,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports.getUsersRatings = getUsersRatings;
module.exports.getLikedMemes = getLikedMemes;
module.exports.getUserMemes = getUserMemes;
